from flask import Flask, request, jsonify
from rdflib import Graph, Namespace, Literal, RDF, URIRef

# Flask App Initialization: Creating a Flask application instance.
app = Flask(__name__)

# Route Decorator: Specifies that the following function (generate_rdf) will handle POST requests to the '/generate_rdf' URL.
@app.route('/generate_rdf', methods=['POST'])

# Request Handler Function: Function named generate_rdf to handle the POST requests.
def generate_rdf():

    # JSON Check: Ensures that the incoming request contains JSON data. If not, it returns an error response with status code 400 (Bad Request).
    if not request.is_json:
        return jsonify({'error': 'Missing JSON in request'}), 400

    # JSON Data Retrieval: Retrieves the JSON data from the request.
    rooms_data = request.get_json()

    # JSON Data Validation: Checks if the 'rooms' key exists in the JSON data. If not, it returns an error response. 
    if 'rooms' not in rooms_data:
        return jsonify({'error': 'JSON body does not have "rooms" key'}), 400
    
    # RDF Graph Initialization: Creates an RDF graph (g) and defines a namespace (ns1) for entities in the graph. 
    # Then, it adds RDF triples to define classes for Appliance, Room, and Person.
    g = Graph()
    ns1 = Namespace("http://example.org/")

    g.add((ns1.Appliance, RDF.type, ns1.Class))
    g.add((ns1.Room, RDF.type, ns1.Class))
    g.add((ns1.Person, RDF.type, ns1.Class))

    # Iteration over Rooms Data: Loops through each room in the 'rooms' data received in the request.
    for room_data in rooms_data['rooms']:
        # Room Data Processing: Processes the name of the room, replacing spaces with underscores, 
        # and creates a URI for the room based on the namespace.
        room_name = room_data['name'].replace(" ", "_")
        room_uri = ns1[room_name]

        # Room Data RDF Triples: Adds RDF triples for the room, 
        # specifying its type, name, side, room type, width, and height.
        g.add((room_uri, RDF.type, ns1.Room))
        g.add((room_uri, ns1.hasName, Literal(room_data['name'])))
        g.add((room_uri, ns1.hasSide, Literal(room_data['side'])))
        g.add((room_uri, ns1.hasRoomType, Literal(room_data['roomType'])))
        g.add((room_uri, ns1.hasWidth, Literal(room_data['w'], datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"))))
        g.add((room_uri, ns1.hasHeight, Literal(room_data['h'], datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"))))

        # Appliances Data Processing: Processes appliances in the room, replacing spaces with underscores, 
        # and creating URIs for appliances based on the namespace.
        appliances = room_data.get('appliances', {})
        for appliance, state in appliances.items():
            appliance_name = appliance.replace(" ", "_")
            appliance_uri = ns1[appliance_name]
            g.add((appliance_uri, RDF.type, ns1.Appliance))
            g.add((room_uri, ns1.hasAppliances, appliance_uri))
            g.add((appliance_uri, ns1.hasApplianceType, Literal(appliance)))

            if state == "ON":
                g.add((room_uri, ns1.hasOnStateAppliance, appliance_uri))
            else:
                g.add((room_uri, ns1.hasOffStateAppliance, appliance_uri))

        # People Data Processing: Processes people in the room, replacing spaces with underscores, 
        # and creating URIs for people based on the namespace.
        people = room_data.get('people', {})
        for person in people:
            person_name = person.replace(" ", "_")
            person_uri = ns1[person_name]

            # People RDF Triples: Adds RDF triples for people, specifying their type, 
            # association with the room, and position (x, y coordinates).
            g.add((person_uri, RDF.type, ns1.Person))
            g.add((room_uri, ns1.hasPerson, person_uri))
            position = people[person]
            g.add((person_uri, ns1.hasPositionX, Literal(position['x'], datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"))))
            g.add((person_uri, ns1.hasPositionY, Literal(position['y'], datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"))))

    # Analyze the RDF graph and use the data to create 3 sets
    rooms_with_people = set()
    rooms_with_lights_on_and_no_people = set()
    rooms_with_people_and_lights_off = set()  

    for room in g.subjects(RDF.type, ns1.Room):
        # Initialize a flag to track if the room has people
        has_people = False

        # Check if the room has any person
        for person in g.objects(room, ns1.hasPerson):
            if person:  # If there's at least one person object, set flag to True
                has_people = True
                room_name = str(g.value(room, ns1.hasName))
                rooms_with_people.add(room_name)
                break  

        # Continue with the logic for checking lights on and no people as before
        light_on = any(appliance for appliance in g.objects(room, ns1.hasOnStateAppliance)
                    if (appliance, ns1.hasApplianceType, Literal("Light")) in g)
        
        # If the room has a light on but no people, add to the list
        if light_on and not has_people:
            room_name = str(g.value(room, ns1.hasName))
            rooms_with_lights_on_and_no_people.add(room_name)
        
        # New logic to check for rooms with people and lights off
        if has_people and not light_on:
            room_name = str(g.value(room, ns1.hasName))
            rooms_with_people_and_lights_off.add(room_name)


    raw_rdf_data = g.serialize(format='turtle')

    response_data = {
        # Raw RDF data
        "rawRDF": raw_rdf_data,
        # Data to determine wether a light should be toggled or not. 
        # This data will be utilized client side to determine wether a light should be on or off
        "lightToggle": {
            "roomsWithPeople": list(rooms_with_people),
            "roomsWithLightsOnAndNoPeople": list(rooms_with_lights_on_and_no_people),
            "roomsWithPeopleAndLightsOff": list(rooms_with_people_and_lights_off)  
        }
    }

    # Return data as a JSON object
    return jsonify(response_data), 200

# Listening on port 8081
if __name__ == '__main__':
    app.run(port=8081, debug=True)
